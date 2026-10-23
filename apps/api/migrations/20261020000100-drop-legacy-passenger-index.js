// ADR 0008: the old unique index on userId + nationalId made every foreign passenger of a user
// collide. The baseline migration has already created its partial replacement.
const INDEX_NOT_FOUND = 27;
const NAMESPACE_NOT_FOUND = 26;

export async function up(db) {
  try {
    await db.collection("passengers").dropIndex("userId_1_nationalId_1");
  } catch (error) {
    if (error.code !== INDEX_NOT_FOUND && error.code !== NAMESPACE_NOT_FOUND) throw error;
  }
}

export async function down() {
  // Recreating the index would reject legitimate data written since.
}
