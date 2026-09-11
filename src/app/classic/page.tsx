import { redirect } from "next/navigation";

/** The 60-track liquid-glass demo is retired. Cognition lives on `/`. */
export default function ClassicRedirect() {
  redirect("/");
}
