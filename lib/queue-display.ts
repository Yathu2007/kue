/** Display name for queue list — never use email. */
export function queueStudentDisplayName(name: string | null) {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Student";
}
