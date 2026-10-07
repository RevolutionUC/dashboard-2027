import { requireRegistrationStaff } from "@/lib/api/registration-auth";
import RegistrationPanel from "./registration-panel";
export default async function RegistrationPage() {
  const access = await requireRegistrationStaff();
  if ("error" in access)
    return <p className="p-6">Registration review is available to approved leads and admins.</p>;
  return <RegistrationPanel />;
}
