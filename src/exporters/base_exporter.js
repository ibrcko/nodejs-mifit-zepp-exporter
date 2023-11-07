const FIX_BIP_GAPS = false;
const NO_VALUE = -2000000;
class ExportablePoint {
    constructor({ time, latitude, longitude, altitude, heartRate, cadence }) {
        this.time = time;
        this.latitude = latitude;
        this.longitude = longitude;
        this.altitude = altitude;
        this.heartRate = heartRate;
        this.cadence = cadence;
    }
}

class Interpolate {
    constructor(xList, yList) {
        this.xList = xList;
        this.yList = yList;
        this.slopes = [];
        for (let i = 0; i < xList.length - 1; i++) {
            const x1 = xList[i], x2 = xList[i + 1];
            const y1 = yList[i], y2 = yList[i + 1];
            this.slopes.push((y2 - y1) / ((x2 - x1) || 1));
        }
    }

    getItem(x) {
        let i = bisectLeft(this.xList, x) - 1;
        if (i >= this.slopes.length) {
            return this.yList[this.yList.length - 1];
        }
        if (i < 0) {
            return this.yList[0];
        }
        return this.yList[i] + this.slopes[i] * (x - this.xList[i]);
    }
}

function bisectLeft(array, x, lo = 0, hi = array.length) {
    while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (array[mid] < x) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

function parsePoints(summary, detail) {
    const trackData = parseTrackData(summary, detail);

    if (!trackData.lat) {
        return [];
    }

    const interpolatedData = interpolateData(trackData);
    const trackedPoints = trackPoints(interpolatedData);
    return Array.from(trackedPoints).map(point => {
        const pt = new ExportablePoint({
            time: new Date((point.time + trackData.startTime) * 1000),
            latitude: point.position.lat,
            longitude: point.position.lon,
            altitude: point.position.alt,
            heartRate: point.hr,
            cadence: point.cadence,
        });

        return pt;
    });
}

function parseTrackData(summary, detail) {
    function splitAndFilter(str, delimiter) {
        return str ? str.split(delimiter).filter(Boolean) : [];
    }

    function processLongitudeLatitude(str) {
        const splitValues = splitAndFilter(str, ';').map(val => val.split(','));
        const lat = splitValues.map(val => parseInt(val[0], 10));
        const lon = splitValues.map(val => parseInt(val[1], 10));
        return { lat, lon };
    }

    function processHeartRate(str) {
        const splitValues = splitAndFilter(str, ';').map(val => val.split(','));
        const hrtimes = splitValues.map(val => parseInt(val[0] || 1, 10));
        const hr = splitValues.map(val => parseInt(val[1], 10));
        return { hrtimes, hr };
    }

    function processGait(str) {
        const splitValues = splitAndFilter(str, ';').map(val => val.split(','));
        const steptimes = splitValues.map(val => parseInt(val[0], 10));
        const stride = splitValues.map(val => parseInt(val[2], 10));
        const cadence = splitValues.map(val => parseInt(val[3], 10));
        return { steptimes, stride, cadence };
    }

    const { lat, lon } = processLongitudeLatitude(detail.longitude_latitude);
    const { hrtimes, hr } = processHeartRate(detail.heart_rate);
    const { steptimes, stride, cadence } = processGait(detail.gait);

    return {
        startTime: parseInt(summary.trackid, 10),
        endTime: parseInt(summary.end_time, 10),
        costTime: -1,
        distance: parseFloat(summary.dis),
        times: splitAndFilter(detail.time, ';').map(val => parseInt(val, 10)),
        lat,
        lon,
        alt: splitAndFilter(detail.altitude, ';').map(val => parseInt(val, 10)),
        hrtimes,
        hr,
        steptimes,
        stride,
        cadence,
    };
}

function interpolateColumn(data, originalPoints, newPoints) {
    const filledData = data.slice();  // Copy the data array
    let oldValue = NO_VALUE;
    for (const value of filledData) {
        if (value !== NO_VALUE) {
            oldValue = value;
            break;
        }
    }
    for (let i = 0; i < filledData.length; i++) {
        if (filledData[i] === NO_VALUE) {
            filledData[i] = oldValue;
        } else {
            oldValue = filledData[i];
        }
    }

    if (newPoints.length === 0) {
        return [];
    }
    if (originalPoints.length === 0) {
        return new Array(newPoints.length).fill(0);
    }
    if (originalPoints.length === 1) {
        return new Array(newPoints.length).fill(originalPoints[0]);
    }

    const interpolate = new Interpolate(originalPoints, filledData);
    return newPoints.map(point => interpolate.getItem(point));
}

class TrackPoint {
    constructor(time, position, hr, stride, cadence) {
        this.time = time;
        this.position = position;
        this.hr = hr;
        this.stride = stride;
        this.cadence = cadence;
    }
}

function* trackPoints(trackData) {
    const zippedData = zip(
        trackData.times,
        trackData.lat,
        trackData.lon,
        trackData.alt,
        trackData.hr,
        trackData.stride,
        trackData.cadence
    );
    for (let [time, lat, lon, alt, hr, stride, cadence] of zippedData) {
        yield new TrackPoint(
            time,
            {
                lat: lat / 100000000,
                lon: lon / 100000000,
                alt: alt / 100
            },
            hr,
            stride,
            cadence
        );
    }
}

function zip(...arrays) {
    const length = Math.min(...arrays.map(arr => arr.length));
    return Array.from({ length }, (_, i) => arrays.map(array => array[i]));
}

function accumulate(iterable) {
    let sum = 0;
    return iterable.map(value => sum += value);
}

function unique(array) {
    return Array.from(new Set(array));
}

function sorted(array) {
    return array.slice().sort((a, b) => a - b);
}

function replace(obj, newValues) {
    return { ...obj, ...newValues };
}

function interpolateData(trackData) {
    let trackTimes = accumulate(trackData.times);
    let hrTimes = accumulate(trackData.hrtimes);
    let stepTimes = accumulate(trackData.steptimes);

    function changeTimes(times, change, timeFrom) {
        return times.map(time => time >= timeFrom ? time + change : time);
    }

    let times = sorted(unique(trackTimes.concat(hrTimes, stepTimes)));

    if (FIX_BIP_GAPS) {
        let timeToTrim = trackTimes.length ? times[times.length - 1] - trackData.costTime : 0;
        while (timeToTrim > 0) {
            let maxTime = 0, maxInterval = 0, lastTime = 0;
            for (const time of times) {
                const currentInterval = time - lastTime;
                lastTime = time;
                if (currentInterval > maxInterval) {
                    maxInterval = currentInterval;
                    maxTime = time;
                }
            }
            const timeChange = Math.max(maxInterval - timeToTrim, 1) - maxInterval;
            trackTimes = changeTimes(trackTimes, timeChange, maxTime);
            hrTimes = changeTimes(hrTimes, timeChange, maxTime);
            stepTimes = changeTimes(stepTimes, timeChange, maxTime);
            timeToTrim += timeChange;
            times = sorted(unique(trackTimes.concat(hrTimes, stepTimes)));
        }
    }

    return replace(trackData, {
        times: times,
        lat: interpolateColumn(accumulate(trackData.lat), trackTimes, times),
        lon: interpolateColumn(accumulate(trackData.lon), trackTimes, times),
        alt: interpolateColumn(trackData.alt, trackTimes, times),
        hrtimes: times,
        hr: interpolateColumn(accumulate(trackData.hr), hrTimes, times),
        steptimes: times,
        stride: interpolateColumn(trackData.stride, stepTimes, times),
        cadence: interpolateColumn(trackData.cadence, stepTimes, times),
    });
}

export {parsePoints};
