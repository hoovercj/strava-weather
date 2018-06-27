// TODO: Models need to use entity generators to interact with storage

import { AuthToken, UserId, ActivityId } from './models';

import * as azure from 'azure-storage';
const credentials = azure.generateDevelopmentStorageCredentials();
const storage = azure.createTableService(credentials);

const TABLE_NAME = 'StravaWeather';

enum PartitionKeys {
    'user_id_to_token',
    'token_to_user_id',
    'processed_activity',
}

class UserIdToTokenModel {
    PartitionKey: PartitionKeys = PartitionKeys.user_id_to_token;
    RowKey: UserId;
    Token: AuthToken;
}

class TokenToUserIdModel {
    PartitionKey: PartitionKeys = PartitionKeys.token_to_user_id;
    RowKey: AuthToken;
    UserId: UserId;
}

class ProcessedActivityModel {
    PartitionKey: PartitionKeys = PartitionKeys.processed_activity;
    RowKey: ActivityId;
    UserId: UserId;
}

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
        console.log(`Query Entities ${continuationToken && '(continued)'}:\n${query.toQueryObject()}`);
        let result = await new Promise<ErrorResultResponse<azure.TableService.QueryEntitiesResult<T>>>((resolve, reject) => {
            storage.queryEntities<T>(TABLE_NAME, query, continuationToken, null, (error, result, response) => {
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
        const response = await this.retrieveEntity<UserIdToTokenModel>(PartitionKeys.user_id_to_token, String(userId));

        return response
            && response.result
            && response.result.Token;
    }

    public getUserIdForToken = async (token: AuthToken): Promise<UserId> => {
        console.log(`getUserIdForToken: ${token}`);
        const response = await this.retrieveEntity<TokenToUserIdModel>(PartitionKeys.token_to_user_id, token);

        return response
            && response.result
            && response.result.UserId;
    }

    public getProcessedActivities = async (userId: UserId): Promise<ActivityId[]> => {
        console.log(`getProcessedActivities: ${userId}`);
        const query = new azure.TableQuery()
            .where('UserId eq ?', userId);

        const response = await this.queryEntities<ProcessedActivityModel>(query);
        return response
            && response.result
            && response.result.entries
            && response.result.entries.map(model => { return model.RowKey });
    }

    public storeUserIdForToken = async (token: AuthToken, userId: UserId): Promise<void> => {
        console.log(`storeUserIdForToken:\nuserId: ${userId}, token: ${token}`);
        const tokenToUserId: TokenToUserIdModel = {
            PartitionKey: PartitionKeys.token_to_user_id,
            RowKey: token,
            UserId: userId,
        };

        const userIdToToken: UserIdToTokenModel = {
            PartitionKey: PartitionKeys.token_to_user_id,
            RowKey: userId,
            Token: token,
        };

        await this.storeEntity(tokenToUserId)
        await this.storeEntity(userIdToToken)
    }

    public storeProcessedActivity = async (activityId: ActivityId, userId: UserId): Promise<void> => {
        console.log(`storeProcessedActivity:\nuserId: ${userId}, activityId: ${activityId}`);
        const activityModel: ProcessedActivityModel = {
            PartitionKey: PartitionKeys.processed_activity,
            RowKey: activityId,
            UserId: userId,
        }

        await this.storeEntity(activityModel);
    }
}