import { v4 as uuidv4 } from "uuid";

export function getAnonymousID() {
  let anonId = localStorage.getItem("anon_user_id");
  if (!anonId) {
    anonId = "Anon-" + uuidv4().slice(0, 6);
    localStorage.setItem("anon_user_id", anonId);
  }
  return anonId;
}