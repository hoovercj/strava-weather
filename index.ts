import dotenv = require('dotenv');
dotenv.config();

import request = require('request-promise-native');
import _authorize = require('strava-v3-cli-authenticator');
const authorize = async (options: any): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
        _authorize(options, (error, value) => {
            if (error) {
                reject(error);
            } else {
                resolve(value);
            }
        });
    });
}

import * as Strava from './strava';
import { WeatherResponse, WeatherSnapshot } from './types/darksky-api';
import * as inquirer from 'inquirer';
import { Question } from 'inquirer';
import { ActivityId, AuthToken, UserId } from './models';

import { DataProvider } from './dataProvider/dataProvider';

const dataProvider = new DataProvider();
dataProvider.init();

const DARK_SKY_API_KEY = process.env.DARK_SKY_API_KEY;

let CURRENT_TOKEN: AuthToken;
let CURRENT_USER_ID: UserId;

const getUserToken = async (): Promise<AuthToken> => {
    if (!CURRENT_TOKEN) {

        const token = await authorize({
            clientId: process.env.STRAVA_CLIENT_ID,
            clientSecret: process.env.STRAVA_CLIENT_SECRET,
            scope: 'write',
            httpPort: 8888
        }).catch(console.error);

        if (token) {
            CURRENT_TOKEN = token;
        }
    }

    return CURRENT_TOKEN;
}

const getUserId = async (): Promise<UserId> => {
    if (!CURRENT_USER_ID) {
        const token = await getUserToken();
        CURRENT_USER_ID = await getUserIdForToken(token);
    }

    return CURRENT_USER_ID;
}

const getUserIdForToken = async (token: AuthToken): Promise<UserId> => {
    const storedUserId = await dataProvider.getUserIdForToken(token);

    if (storedUserId) {
        return storedUserId;
    }

    const athleteApi = new Strava.AthletesApi();
    athleteApi.accessToken = token;
    const loggedInAthlete = await athleteApi.getLoggedInAthlete();
    const userId = loggedInAthlete.body.id

    await dataProvider.storeUserIdForToken(token, userId);

    return userId;
}

const getTokenForUserId = async (userId: UserId): Promise<AuthToken> => {
    return dataProvider.getTokenForUserId(userId);
}

const getActivitiesForToken = async (token: AuthToken): Promise<Strava.SummaryActivity[]> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    const activitiesReponse = await activitiesApi.getLoggedInAthleteActivities()
        .catch(console.error);

    return activitiesReponse && activitiesReponse.body;
}

const getActivitiesForUserId = async (userId: UserId): Promise<Strava.SummaryActivity[]> => {
    const token = await getTokenForUserId(userId)
        .catch(console.error);

    return token && getActivitiesForToken(token);
}

const getDetailedActivity = async (token: AuthToken, activityId: ActivityId): Promise<Strava.DetailedActivity> => {
    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    const activityResponse = await activitiesApi.getActivityById(activityId)
        .catch(console.error);

    return activityResponse && activityResponse.body;
}

const updateActivity = async (token: AuthToken, userId: UserId, activityId: ActivityId, update: Strava.UpdatableActivity): Promise<void> => {
    console.log(`Update activity:\nToken: ${token}\nUserId: ${userId}\nactivityId: ${activityId}\nUpdate: ${JSON.stringify(update)}`);

    const activitiesApi = new Strava.ActivitiesApi();
    activitiesApi.accessToken = token;
    const response = await activitiesApi.updateActivityById(activityId, update)
        .catch(console.error);

    if (response) {
        await dataProvider.storeProcessedActivity(activityId, userId);
    }
}

const getWeatherFromDetailedRun = async (run: Strava.DetailedActivity): Promise<WeatherSnapshot> => {
    const url = `https://api.darksky.net/forecast/${DARK_SKY_API_KEY}/${run.startLatlng[0]},${run.startLatlng[1]},${Math.floor(Number(run.startDate) / 1000)}`;
    console.log(url);
    const response = await request(url)
        .catch(console.error);

    if (!response) {
        return;
    }

    const weatherResponse = JSON.parse(response) as WeatherResponse;
    return weatherResponse && weatherResponse.currently;
}

const getDescriptionFromWeather = (weather: WeatherSnapshot): string => {
    const strings = [];
    strings.push(`Weather Summary: ${weather.summary}`);
    strings.push(`Temperature: ${tempToString(weather.temperature)}`);

    const heatIndexDiff = Math.abs(weather.apparentTemperature - weather.temperature);
    if (heatIndexDiff > 10) {
        strings.push(`Felt Like: ${tempToString(weather.apparentTemperature)}`);
    }

    strings.push(`Humidity: ${weather.humidity * 100}%`);

    if (weather.uvIndex >= 7) {
        strings.push(`UV Index: ${weather.uvIndex}`);
    }

    strings.push(`Wind Speed: ${speedToString(weather.windSpeed)}`);

    // Does not have to be an absolute value
    const windGustDiff = weather.windSpeed - weather.windGust;
    if (windGustDiff > 5) {
        strings.push(`Gusts up to: ${speedToString(weather.windGust)}`);
    }

    return strings.join('\n');
}

const getUpdatedDescriptionForActivityId = async (token: AuthToken, activityId: number) => {
    const mostRecentActivityDetails = await getDetailedActivity(token, activityId)
        .catch(console.error);
    if (!mostRecentActivityDetails) return;

    const weatherDetails = await getWeatherFromDetailedRun(mostRecentActivityDetails)
        .catch(console.error);
    if (!weatherDetails) return;

    const weatherDescription = getDescriptionFromWeather(weatherDetails);

    // If the comment already contains the weather information, don't add it again
    if (mostRecentActivityDetails.description && mostRecentActivityDetails.description.indexOf("Weather Summary") >= 0) {
        return mostRecentActivityDetails.description;
    }

    const newComment = [mostRecentActivityDetails.description, weatherDescription].join('\n\n').trim();

    return newComment;
}

// STARTREGION Weather Utils

const farenheitToCelcius = (temp: number): string => {
    return getRoundedString((temp - 32) * (5 / 9), 2);
}

const tempToString = (temp: number): string => {
    return `${temp}° (${farenheitToCelcius(temp)}C)`;
}

const speedToString = (speed: number): string => {
    return `${speed} mph (${getRoundedString(speed * 0.44704, 2)} m/s)`;
}

function getRoundedString(value: number | string, decimals: number): string {
    return Number(Math.round(Number(value + 'e' + decimals)) + 'e-' + decimals).toFixed(decimals);
}

// ENDREGION Weather Utils

// STARTREGION Prompts


const listProcessedActivities = async () => {
    const userId = await getUserId();
    const processedActivities = await dataProvider.getProcessedActivities(userId);
    console.log('Processed Activities:');
    processedActivities.map(console.log);
}

const startUpdateActivitiesPrompt = async () => {
    const token = await getUserToken();
    const userId = await getUserId();

    if (!token) {
        console.log('Unable to authenticate.');
        return;
    }

    const userActivities = await getActivitiesForToken(token)
        .catch(console.error);
    if (!Array.isArray(userActivities)) {
        console.log('Error fetching activities.');
        return;
    }

    const processedActivities = await dataProvider.getProcessedActivities(userId);

    const unprocessedUserActivities = userActivities.filter(activity => processedActivities.indexOf(activity.id) < 0);

    const activityOptions = unprocessedUserActivities.map(activity => {
        return {
            name: `${activity.startDateLocal} - ${activity.name}`,
            value: activity.id,
        } as inquirer.ChoiceType;
    });
    const whichActivityQuestion: Question = {
        name: 'which_activity',
        type: 'list',
        message: 'which activity would you like to update?',
        choices: activityOptions
    }
    const whichActivityAnswer = await inquirer.prompt(whichActivityQuestion)
        .catch(console.error);

    const selectedActivity = whichActivityAnswer[whichActivityQuestion && whichActivityQuestion.name];
    if (!selectedActivity) {
        console.log(`I didn't understand that response.`);
        return;
    }

    const newDescription = await getUpdatedDescriptionForActivityId(token, selectedActivity)
        .catch(console.error);
    if (!newDescription) {
        console.log('Unable to generate a new description.');
        return;
    }

    const confirmDescriptionQuestion: Question = {
        name: 'confirm_description',
        type: 'confirm',
        message: ['Would you like to update activity to have this description?', newDescription].join('\n')
    };
    const confirmDescriptionAnswer = await inquirer.prompt(confirmDescriptionQuestion)
        .catch(console.error);

    const newDescriptionConfirmed = confirmDescriptionAnswer[confirmDescriptionQuestion && confirmDescriptionQuestion.name];
    if (newDescriptionConfirmed === undefined) {
        console.log(`I didn't understand that response.`);
        return;
    }

    if (newDescriptionConfirmed) {
        console.log('Updating activity...');
        const updatedActivity: Strava.UpdatableActivity = { description: newDescription };
        await updateActivity(token, userId, selectedActivity, updatedActivity)
            .then(() => console.log(`Activity updated! See it here https://www.strava.com/activities/${selectedActivity}`))
            .catch(console.error)
    }

    startUpdateActivitiesPrompt();
}

// ENDREGION Prompts

startUpdateActivitiesPrompt();