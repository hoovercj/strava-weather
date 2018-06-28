import { AuthToken, UserId, ActivityId } from '../models';
import {
    PartitionKeys,
    TokenToUserIdModel, TokenToUserIdEntity,
    UserIdToTokenModel, UserIdToTokenEntity,
    ProcessedActivityModel, ProcessedActivityEntity,
} from './models';

import * as azure from 'azure-storage';
const credentials = azure.generateDevelopmentStorageCredentials();
const storage = azure.createTableService(credentials);

const TABLE_NAME = 'StravaWeather';

export interface ErrorResultResponse<T> {
    error: Error;
    result: T;
    response: azure.ServiceResponse;
}

export class DataProvider {

    private async storeEntity<T>(entity: T) {
        console.log(`Storing Entity:\n${JSON.stringify(entity)}`);
        return new Promise<ErrorResultResponse<azure.TableService.EntityMetadata>>((resolve, reject) => {
            storage.insertOrReplaceEntity<T>(TABLE_NAME, entity, (error, result, response) => {
                resolve({error, result, response});
            });
        });
    }

    private async retrieveEntity<T>(partitionKey: PartitionKeys, id: string) {
        console.log(`Retreiving Entity:\nKey: ${partitionKey}, Id: ${id}`);
        return new Promise<ErrorResultResponse<T>>((resolve, reject) => {
            storage.retrieveEntity<T>(TABLE_NAME, String(partitionKey), id, (error, result, response) => {
                resolve({error, result, response});
            });
        });
    }

    private async queryEntities<T>(query: azure.TableQuery, continuationToken?: azure.TableService.TableContinuationToken) {
        console.log(`Query Entities ${(continuationToken && '(continued)') || ''}:\n${JSON.stringify(query.toQueryObject())}`);
        let result = await new Promise<ErrorResultResponse<azure.TableService.QueryEntitiesResult<T>>>((resolve, reject) => {

            storage.queryEntities<T>(TABLE_NAME, query, continuationToken, null, (error, result, response) => {
                console.log(`Query Entities Reults:\n${JSON.stringify(result.entries)}`);
                resolve({error, result, response});
            });
        });

        // If there is a continuation token, query recursively until they are all found
        // Replace the result object with a the continued result object with augmented entries
        if (result
            && result.result
            && result.result.continuationToken) {
            const continuedResult = await this.queryEntities<T>(query, result.result.continuationToken);

            continuedResult.result.entries.push(...result.result.entries);
            result = continuedResult;
        }

        return result;
    }

    public async init() {
        console.log(`Init`);
        return new Promise<ErrorResultResponse<azure.TableService.TableResult>>((resolve, reject) => {
            storage.createTableIfNotExists(TABLE_NAME, (error, result, response) => {
                resolve({error, result, response});
            });
        });
    }

    public getTokenForUserId = async (userId: UserId): Promise<AuthToken> => {
        console.log(`getTokenForUserId: ${userId}`);
        const response = await this.retrieveEntity<UserIdToTokenEntity>(PartitionKeys.UserIdToToken, String(userId));

        return response
            && response.result
            && UserIdToTokenModel.fromEntity(response.result).token;
    }

    public getUserIdForToken = async (token: AuthToken): Promise<UserId> => {
        console.log(`getUserIdForToken: ${token}`);
        const response = await this.retrieveEntity<TokenToUserIdEntity>(PartitionKeys.TokenToUserId, token);

        return response
            && response.result
            && TokenToUserIdModel.fromEntity(response.result).userId;
    }

    public getProcessedActivities = async (userId: UserId): Promise<ActivityId[]> => {
        console.log(`getProcessedActivities: ${userId}`);
        const query = new azure.TableQuery()
            .where('UserId eq ?', userId)
            .and('PartitionKey eq ?', PartitionKeys.ProcessedActivity);

        const response = await this.queryEntities<ProcessedActivityEntity>(query);
        return response
            && response.result
            && response.result.entries
            && response.result.entries
                .map(ProcessedActivityModel.fromEntity)
                .map(model => model.activityId);
    }

    public storeUserIdForToken = async (token: AuthToken, userId: UserId): Promise<void> => {
        console.log(`storeUserIdForToken:\nuserId: ${userId}, token: ${token}`);

        const tokenToUserIdEntity = TokenToUserIdModel.toEntity(token, userId);
        const userIdToTokenEntity = UserIdToTokenModel.toEntity(userId, token);

        await this.storeEntity(tokenToUserIdEntity)
        await this.storeEntity(userIdToTokenEntity)
    }

    public storeProcessedActivity = async (activityId: ActivityId, userId: UserId): Promise<void> => {
        console.log(`storeProcessedActivity:\nuserId: ${userId}, activityId: ${activityId}`);
        const activityEntity = ProcessedActivityModel.toEntity(activityId, userId);
        await this.storeEntity(activityEntity);
    }
}