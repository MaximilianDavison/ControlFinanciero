import { auth } from "../../../../lib/auth.js";
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
