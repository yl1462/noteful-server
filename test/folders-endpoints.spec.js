const { expect } = require('chai');
const knex = require('knex');
const app = require('../src/app');

const {
  makeFoldersArray,
  makeMaliciousFolder
  //dateParse //If date parsing necessary
} = require('./folders.fixtures');

describe('Folders Endpoints', function() {
  let db;
  before('make knex instance to simulate server', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL //Did you migrate the test database?...
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('clean tables before each test', () => {
    db.raw('TRUNCATE folders_notes, notes, folders RESTART IDENTITY CASCADE');
  });

  afterEach('clean tables after each test', () => {
    db.raw('TRUNCATE folders_notes, notes, folders RESTART IDENTITY CASCADE');
  });

  describe('GET /api/folders', () => {
    context('folders table has no contents', () => {
      it('Responds with a 200 status and an empty array', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, []);
      });
    });

    context('folders table has some folders', () => {
      const testFolders = makeFoldersArray();

      beforeEach('populate table with folders', () => {
        return db.into('folders').insert(testFolders);
      });

      afterEach('clean folders table', () => {
        return db.raw(
          'TRUNCATE folders_notes, notes, folders RESTART IDENTITY CASCADE'
        );
      });

      it('responds with an array containing all test folders', () => {
        return supertest(app)
          .get('/api/folders')
          .expect(200, testFolders);
      });

      context('given an XSS attack folder in name', () => {
        const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
        beforeEach('insert malicious folder', () => {
          return db.into('folders').insert([maliciousFolder]);
        });
        afterEach('clean folders table', () => {
          return db.raw(
            'TRUNCATE folders_notes, notes, folders RESTART IDENTITY CASCADE'
          );
        });

        it('removes XSS attack content (<script> to &lt;script&gt)', () => {
          let expectedFolders = testFolders;
          expectedFolders.splice(3, 1, expectedFolder);
          return supertest(app)
            .get('/api/folders')
            .expect(200)
            .expect(res => {
              expect(res.body[3].name).to.eql(expectedFolder.name);
            });
        });
      });
    });
  });

  describe('GET /api/folders/:folder_id', () => {
    context(
      'given folders table has no contents or no folder ids match given id',
      () => {
        it('Responds with a 404', () => {
          const folderId = 'a1168b2f-ef6f-44db-ac34-3715ccfb13f3';
          return supertest(app)
            .get(`/api/folders/${folderId}`)
            .expect(404, { error: { message: 'No matching folder' } });
        });
      }
    );

    context('folders table has some folders', () => {
      const testFolders = makeFoldersArray();

      beforeEach('populate table with folders', () => {
        return db.into('folders').insert(testFolders);
      });

      afterEach('clean folders table', () => {
        return db.raw(
          'TRUNCATE folders_notes, notes, folders RESTART IDENTITY CASCADE'
        );
      });

      it('given valid id, responds with a folder with matching id.', () => {
        const expectedId = testFolders[1].id,
          expectedFolder = testFolders[1];

        return supertest(app)
          .get(`/api/folders/${expectedId}`)
          .expect(res => {
            expect(res.body.name).to.eql(expectedFolder.name);
          });
      });
    });

    context('given an XSS attack folder in name (<script>)', () => {
      const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
      beforeEach('insert malicious folder', () => {
        return db.into('folders').insert([maliciousFolder]);
      });

      afterEach('clean folders table', () => {
        return db.raw(
          'TRUNCATE folders_notes, notes, folders RESTART IDENTITY CASCADE'
        );
      });

      it('removes XSS attack in name (<script> becomes &lt;script&gt)', () => {
        return supertest(app)
          .get(`/api/folders/${maliciousFolder.id}`)
          .expect(200)
          .expect(res => {
            expect(res.body.name).to.eql(expectedFolder.name);
          });
      });
    });
  });
});