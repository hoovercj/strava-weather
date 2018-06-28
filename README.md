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

* [] Polish the CLI so it is a useful standalone tool
* [] Create Azure Functions or simple node app
    - Hosted auth callback that stores authorized users
    - On a timer, for each authorized user, fetch the new runs and update them
* [] Get approved for webhook access
    - Instead of running on a timer, simply process new runs as they come in

