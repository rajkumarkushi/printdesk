import { useState, useEffect } from "react";
import API from "../services/api";

export default function useProfile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    API.get("/business/profile")
      .then((res) => setProfile(res.data))
      .catch(() => {});
  }, []);

  return profile;
}
