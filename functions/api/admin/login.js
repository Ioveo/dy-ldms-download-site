import { loginAdmin } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  return loginAdmin(request, env);
}
