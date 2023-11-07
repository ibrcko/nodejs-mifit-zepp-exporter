import {GpxExporter} from "./src/exporters/gpx_exporter.js";
import { Api } from "./src/api.js";
import { Scraper } from "./src/scraper.js";

const args = {
    format: "gpx",
    outputDir: "./workouts",
}

const api = new Api();
const scraper = new Scraper(api, new GpxExporter(), args.outputDir, args.format);
scraper.run();
