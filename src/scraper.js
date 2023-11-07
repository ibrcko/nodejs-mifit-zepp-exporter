import { createLogger, format, transports } from 'winston';
import { join, dirname } from 'path';
import { promises }  from 'fs';
import { parsePoints } from "./exporters/base_exporter.js";

const LOGGER = createLogger({
    level: 'info',
    format: format.simple(),
    transports: [new transports.Console()]
});

class Scraper {
    constructor(api, exporter, outputDir, fileFormat) {
        this.api = api;
        this.exporter = exporter;
        this.outputDir = outputDir;
        this.fileFormat = fileFormat;
    }

    getOutputFilePath(fileName) {
        return `${join(this.outputDir, fileName)}.${this.fileFormat}`;
    }

    async fetchWorkoutSummaries() {
        let summaries = [];
        let history = await this.api.get_workout_history();

        summaries.push(...history.data.summary);

        while (history.data.next !== -1) {
            LOGGER.info(`Fetching more summaries starting from workout ${history.data.next}`);
            history = await this.api.get_workout_history(history.data.next);
            summaries.push(...history.data.summary);
        }

        LOGGER.info(`There are ${summaries.length} workouts in total`);
        return summaries;
    }

    async run() {
        const summaries = await this.fetchWorkoutSummaries();
        for (let summary of summaries) {
            const detail = await this.api.get_workout_detail(summary);
            const trackId = parseInt(summary.trackid);
            const fileName = summary.type + '-' + new Date(trackId * 1000).toISOString().replace(/:/g, '-').replace('T', '--');

            const outputFilePath = this.getOutputFilePath(fileName);
            const outputDir = dirname(outputFilePath);
            await promises.mkdir(outputDir, { recursive: true });

            const exists = await promises.access(outputDir).then(() => true).catch(() => false);
            if (!exists) throw new Error("Couldn't create output folder");

            const points = parsePoints(summary, detail.data);

            await this.exporter.export(outputFilePath, summary, points);
            LOGGER.info(`Downloaded ${outputFilePath}`);
        }
    }
}

export { Scraper };
