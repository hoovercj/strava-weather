export interface WeatherResponse {
    currently: WeatherSnapshot;
}

export interface WeatherSnapshot {
    summary: string;
    temperature: number;
    apparentTemperature: number;
    windSpeed: number;
    windGust: number;
    humidity: number;
    uvIndex: number;
}