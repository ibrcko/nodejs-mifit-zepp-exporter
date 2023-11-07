# Node.js - Mi Fit and Zepp workout exporter

This repository is a simplified Node.js rewrite of the existing python implementation [Mi-Fit-and-Zepp-workout-exporter](https://github.com/rolandsz/Mi-Fit-and-Zepp-workout-exporter).

Workouts that will be exported are (this can be tweaked to your preferences in `gpx_exporter.js`):
- Run
- Hike
- Ride
- Swim
- WeightTraining
- Yoga

## Environment setup
```bash
npm install
```

## Get the token
1. Open the [GDPR page](https://user.huami.com/privacy2/index.html?loginPlatform=web&platform_app=com.xiaomi.hm.health)
2. Click `Export data`
3. Sign in to your account
4. Open the developer tools in your browser (F12)
5. Select the `Network` tab
6. Click on `Export data` again
7. Look for any request containing the `apptoken` header or cookie
8. Paste the token in .env file as the `API_AUTH_TOKEN` value instead of `<token>`

## Usage
The script authenticates the user with the API then exports all workouts to the output directory (`./workouts`) in GPX format.

```bash
npm run export
```

## Acknowledgements

Big thanks to [rolandsz](https://github.com/rolandsz)!
