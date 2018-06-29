# Strava Weather Summaries

This app applies a weather summary to Strava activities

## What works?

This is only a proof-of-concept cli app which opens a browser to authorize the app, fetches a list of activities, and prompts the user to choose one to add weather information to. After the user selects an activity, the weather information for that activity is fetched and an updated description is presented to the user to approve. If the user accepts, the activity description is updated.

## Try it out

### Prerequisites
* [Azure Storage Emulator](https://docs.microsoft.com/en-us/azure/storage/common/storage-use-emulator)
* [Dark Sky Api Key](https://darksky.net/dev)
* [Strava API Key](https://developers.strava.com)
* Rename `.env.example` and add the API keys

### Commands
```
npm install
tsc
node ./index.js
```

## To-do:

* [] Create node api + web site
    - [] Web api to handle auth + fetching/posting data
        - [] Handle auth for user
        - [] Get users activities (including information about already-processed activities)
        - [] Suggest new description for an activity
        - [] Update description for an activity
    - [] Web site
        - [] Auth user
        - [] List activities
        - [] Get suggested description for activity
        - [] Allow user to edit and then post the new description
    - [] Get approved for webhook access
        - [] Allow users to "subscribe" to automatic updates
        - [] Webhook receives event for each activity. If user is subscribed, automatically update their comment
        - [] Allow users to unsubscribe
* [] Stretch Goals
    - [] User Configuration
        - [] Language
        - [] Units (metric, si, both)
        - [] Fields
            - Either toggling them on/off OR providing their own template with placeholders, etc.

