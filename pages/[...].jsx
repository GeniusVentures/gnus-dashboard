// pages/[...slug].js

import { useRouter } from "next/router";
import { useEffect } from "react";

const CatchAllPage = () => {
  const router = useRouter();

  // Redirect to root when the component mounts
  useEffect(() => {
    router.replace("/");
  }, []);
};

export default CatchAllPage;
