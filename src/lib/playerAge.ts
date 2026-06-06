export function calcAge(dobIso: string | null) {
  if (!dobIso) return null;

  const dob = new Date(dobIso);

  if (Number.isNaN(dob.getTime())) return null;

  const now = new Date();

  let age = now.getFullYear() - dob.getFullYear();

  const m = now.getMonth() - dob.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age < 0 ? null : age;
}