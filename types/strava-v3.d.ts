declare module 'strava-v3' {
    type DoneCallback<T> = (error: any, payload: T, limits: any) => void;

    type ArgsFunction<T> = (args: any, done: DoneCallback<T>) => void;

    type Scope =  'public' | 'write' | 'view_private' | 'view_private,write';

    interface MetaAthlete {
        id: number;
    }

    type ActivityType = "AlpineSki" | "BackcountrySki" | "Canoeing" | "Crossfit" | "EBikeRde" | "Elliptical" | "Hike" | "IceSkate" | "InlineSkate" | "Kayaking" | "Kitesurf" | "NordicSki" | "Ride" | "RockClimbing" | "RollerSki" | "Rowing" | "Run" | "Snowboard" | "Snowshoe" | "StairStepper" | "StandUpPaddling" | "Surfing" | "Swim" | "VirtualRide" | "VirtualRun" | "Walk" | "WeightTraining" | "Windsurf" | "Workout" | "Yoga";

    type LatLng = [number, number];

    interface PolylineMap {
        id: string;
        polyline: string;
        summary_polyline: string;
    }

    enum ResourceState {
        summary = 2,
        detail = 3,
    }

    interface SummaryGear {
        id: string;
        resource_state: ResourceState;
        primary: boolean;
        name: string;
        distance: number;
    }

    interface SummaryActivity {
        id: number;
        external_id: string;
        upload_id: number;
        athlete: MetaAthlete;
        name: string;
        distance: number;
        moving_time: number;
        elapsed_time: number;
        total_elevation_gain: number;
        elev_high: number;
        elev_low: number;
        type: ActivityType;
        start_date: string;
        start_date_local: string;
        timezone: string;
        start_latlng: LatLng;
        end_latlng: LatLng;
        achievement_count: number;
        kudos_count: number;
        comment_count: number;
        athlete_count: number;
        photo_count: number;
        total_photo_count: number;
        map: PolylineMap;
        trainer: boolean;
        commute: boolean;
        manual: boolean;
        private: boolean;
        flagged: boolean;
        workout_type: number;
        average_speed: number;
        max_speed: number;
        has_kudoed: boolean;
    }

    interface DetailedActivity extends SummaryActivity {
        description: string;
        gear: SummaryGear;
        calories: number;
        segment_effort: any;
        device_name: string;
        embed_token: string;
        splits_metric: any;
        splits_standard: any;
        laps: any;
        best_efforts: any;
    }

    interface UpdatableActivity {
        id: string;
        commute?: boolean;
        trainer?: boolean;
        description?: string;
        name?: string;
        type?: string;
        private?: boolean;
        gear_id?: string;
    }

    interface Strava {
        oauth: {
            getRequestUrl: (args: {
                scope?: Scope,
                state?: string,
                approval_prompt?: 'force' | 'auto',
            }) => string;

            getToken: (code: string, done: DoneCallback<any>) => void;

            deauthorize: (args: {access_token: string}, done: DoneCallback<any>) => void;
        }

        athlete: {
            listActivities: (args: any, done: DoneCallback<SummaryActivity[]>) => void;
        }

        activities: {
            get: (args: { id: string }, done: DoneCallback<DetailedActivity>) => void;
            update: (args: UpdatableActivity, done: DoneCallback<DetailedActivity>) => void;
        }
    }

    const strava: Strava;

    export = strava;
}