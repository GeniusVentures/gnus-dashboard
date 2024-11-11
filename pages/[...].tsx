import { useRouter } from "next/router";
import { useEffect } from "react";

const CatchAllPage: React.FC = () => {
  const router = useRouter();

  // Redirect to root when the component mounts
  useEffect(() => {
    router.replace("/");
  }, []);

  return null;
};

export default CatchAllPage;
