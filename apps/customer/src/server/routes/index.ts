import "server-only";
// Order matters: literal paths (e.g. /orders/draft/items) must register
// before param paths (/orders/:id/...). Each module registers on import.
import "./auth";
import "./pin";
import "./catalogue";
import "./payments";
import "./orders";
import "./events";
import "./admin";
import "./email";

export { dispatch } from "../router";
