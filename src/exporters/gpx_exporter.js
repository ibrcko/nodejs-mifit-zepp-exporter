import fs from 'fs';
import { createLogger, format, transports } from  'winston';

const LOGGER = createLogger({
        level: 'info',
        format: format.simple(),
        transports: [new transports.Console()]
    });

function mapWorkoutType(summary) {
    switch (summary.type) {
        case 1:
            return 'Run';
        case 6:
            return 'Hike';
        case 9:
            return 'Ride';
        case 14:
            return 'Swim';
        case 16:
            return 'WeightTraining';
        case 60:
            return 'Yoga';
        default:
            LOGGER.warn(`Unhandled type for workout ${summary.trackid}: ${summary.type}`);
            return null;
    }
}

class GpxExporter {
    export(outputFilePath, summary, points) {
        const ind = '\t';
        const time = new Date(summary.trackid * 1000).toISOString();
        const writeStream = fs.createWriteStream(outputFilePath);
        writeStream.write('<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\n');
        writeStream.write(
            '<gpx xmlns="http://www.topografix.com/GPX/1/1" ' +
            'xmlns:gpxdata="http://www.cluetrust.com/XML/GPXDATA/1/0" ' +
            'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">\n'
        );
        writeStream.write(`${ind}<metadata><time>${time}</time></metadata>\n`);
        writeStream.write(`${ind}<trk>\n`);
        writeStream.write(`${ind}${ind}<name>${time}</name>\n`);

        const workoutType = mapWorkoutType(summary);
        if (workoutType) {
            writeStream.write(`${ind}${ind}<type>${workoutType}</type>\n`);
        }

        writeStream.write(`${ind}${ind}<trkseg>\n`);
        for (const point of points) {
            let extHr = '';
            let extCadence = '';
            if (point.heartRate) {
                extHr = (
                    `<gpxtpx:TrackPointExtension>` +
                    `<gpxtpx:hr>${point.heartRate}</gpxtpx:hr>` +
                    `</gpxtpx:TrackPointExtension>` +
                    `<gpxdata:hr>${point.heartRate}</gpxdata:hr>`
                );
            }
            if (point.cadence) {
                extCadence = `<gpxdata:cadence>${point.cadence}</gpxdata:cadence>`;
            }
            writeStream.write(
                `${ind}${ind}${ind}<trkpt lat="${point.latitude}" lon="${point.longitude}">` +
                `<ele>${point.altitude}</ele>` +
                `<time>${point.time.toISOString()}</time>` +
                `<extensions>` +
                `${extHr}${extCadence}` +
                `</extensions>` +
                `</trkpt>\n`
            );
        }
        writeStream.write(`${ind}${ind}</trkseg>\n`);
        writeStream.write(`${ind}</trk>\n`);
        writeStream.write('</gpx>');
        writeStream.end();
    }
}

export { GpxExporter };
