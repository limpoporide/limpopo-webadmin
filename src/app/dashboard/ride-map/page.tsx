import RideMapClient from "./RideMapClient";

export default function RideMapPage() {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    null;

  return <RideMapClient apiKey={apiKey} />;
}
