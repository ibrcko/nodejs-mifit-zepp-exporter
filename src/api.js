import get from "axios";
import urlJoin from "url-join";
import 'dotenv/config'

const APP_NAME = process.env.APP_NAME;
const APP_PLATFORM = process.env.APP_PLATFORM;

const BASE_URL = process.env.API_BASE_URL;
const AUTH_TOKEN = process.env.API_AUTH_TOKEN;

class Api {
    async get_workout_history(from_track_id = null) {
        return await this._do_request(
            "/v1/sport/run/history.json",
            from_track_id ? {trackid: from_track_id} : {}
        );
    }

    async get_workout_detail(workout) {
        return await this._do_request(
            "/v1/sport/run/detail.json",
            {
                trackid: workout.trackid,
                source: workout.source,
            }
        );
    }

    async _do_request(endpoint, params) {
        const response = await get(
            urlJoin(BASE_URL, endpoint),
            {
                headers: {
                    apptoken: AUTH_TOKEN,
                    appPlatform: APP_PLATFORM,
                    appname: APP_NAME,
                },
                params: params,
            }
        );
        if (response.status >= 400) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        return response.data;
    }
}

export { Api };
