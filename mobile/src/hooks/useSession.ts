import { useEffect, useState } from "react";
import { getStoredUser, StoredUser, subscribeSession } from "@/lib/auth";

export function useSession(): StoredUser | null {
  const [user, setUser] = useState<StoredUser | null>(() => getStoredUser());
  useEffect(() => subscribeSession(() => setUser(getStoredUser())), []);
  return user;
}