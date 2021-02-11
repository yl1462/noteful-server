const FoldersService = {
  getAllFolders(knex) {
    return knex.select('*').from('folders');
  },
  insertFolder(knex, newFolder) {
    return knex
      .insert(newFolder)
      .into('folders')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },

  getById(knex, id) {
    return knex
      .from('folders')
      .select('*')
      .where({ id })
      .first();
  },

  deleteFolder(knex, id) {
    return knex('folders').delete(id);
  },

  updateFolder(knex, id, newFolderFields) {
    return knex('folders')
      .where({ id })
      .update(newFolderFields);
  }
};

module.exports = FoldersService;