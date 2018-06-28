import { ActivityId, AuthToken, UserId } from '../models';
import { TableUtilities } from 'azure-storage';

const entGen = TableUtilities.entityGenerator;

export enum PartitionKeys {
    UserIdToToken = 'user_id_to_token',
    TokenToUserId = 'token_to_user_id',
    ProcessedActivity = 'processed_activity',
}

export interface UserIdToTokenEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    Token: TableUtilities.entityGenerator.EntityProperty<string>;
}

export interface TokenToUserIdEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserId: TableUtilities.entityGenerator.EntityProperty<number>;
}

export interface ProcessedActivityEntity {
    PartitionKey: TableUtilities.entityGenerator.EntityProperty<string>;
    RowKey: TableUtilities.entityGenerator.EntityProperty<string>;
    UserId: TableUtilities.entityGenerator.EntityProperty<number>;
}

export class UserIdToTokenModel {
    constructor(public userId: UserId, public token: AuthToken) {
    }

    public static fromEntity(entity: UserIdToTokenEntity): UserIdToTokenModel {
        return new UserIdToTokenModel(Number(entity.RowKey._), entity.Token._);
    }

    public static toEntity(userId: UserId, token: AuthToken): UserIdToTokenEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.UserIdToToken)),
            RowKey: entGen.String(String(userId)),
            Token: entGen.String(token),
        };
    }
}

export class TokenToUserIdModel {
    constructor(public token: AuthToken, public userId: UserId) {
    }

    public static fromEntity(entity: TokenToUserIdEntity): TokenToUserIdModel {
        return new TokenToUserIdModel(entity.RowKey._, entity.UserId._);
    }

    public static toEntity(token: AuthToken, userId: UserId): TokenToUserIdEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.TokenToUserId)),
            RowKey: entGen.String(token),
            UserId: entGen.Int32(userId),
        };
    }
}

export class ProcessedActivityModel {
    constructor(public activityId: ActivityId, public userId: UserId) {
    }

    public static fromEntity(entity: ProcessedActivityEntity): ProcessedActivityModel {
        return new ProcessedActivityModel(Number(entity.RowKey._), entity.UserId._);
    }

    public static toEntity(activityId: ActivityId, userId: UserId): ProcessedActivityEntity {
        return {
            PartitionKey: entGen.String(String(PartitionKeys.ProcessedActivity)),
            RowKey: entGen.String(String(activityId)),
            UserId: entGen.Int32(userId),
        };
    }
}
