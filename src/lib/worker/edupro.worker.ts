import * as Comlink from "comlink";
import { EduproWorkerService } from "$lib/worker/service";

Comlink.expose(new EduproWorkerService());
