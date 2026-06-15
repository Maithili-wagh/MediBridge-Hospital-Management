import { HeartPulse } from "lucide-react";

export default function Logo() {
  return (
    <button className="logo" onClick={() => location.reload()}>
      <HeartPulse size={22} />
      <span>MediBridge</span>
    </button>
  );
}
