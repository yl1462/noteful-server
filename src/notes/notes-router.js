const express = require('express'),
  path = require('path'),
  xss = require('xss'),
  NotesService = require('./notes-service'),
  FolderService = require('../folders/folders-service'),
  notesRouter = express.Router(),
  jsonParser = express.json();

const serializeNote = note => ({
  id: note.id,
  name: xss(note.name),
  modified: new Date(note.modified),
  content: xss(note.content),
  folder_id: note.folder_id
});

notesRouter
  .route('/')
  .get((req, res, next) => {
    NotesService.getAllNotes(req.app.get('db'))
      .then(notes => {
        res.json(notes.map(serializeNote));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { name, content, folder_id } = req.body,
      newNote = { name, content, folder_id };
    
      console.log(newNote);

    const folder = FolderService.getById(req.app.get('db'), newNote.folder_id);

    if (!folder) {
      return res.status(400).json({
        error: {
          message: `Folder does not exist`
        }
      });
    }

    for (const [key, value] of Object.entries(newNote)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing ${key} in request body` }
        });
      }
    }

    newNote.name = xss(newNote.name);
    newNote.content = xss(newNote.content);

    NotesService.insertNote(req.app.get('db'), newNote)
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note));
      });
  });

notesRouter
  .route('/:noteId')
  .all((req, res, next) => {
    NotesService.getById(
      req.app.get('db'),
      req.params.noteId
    )
      .then(note => {
        if (!note) {
          return res.status(404).json({
            error: { message: `Note not found` }
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNote(res.note));
  })
  .patch((req, res, next) => {
    const { name, content } = req.body;
    const updateNote = { name, content }

    const numberOfValues = Object.values(updateNote).filter(Boolean).length;
    if (numberOfValues === 0)
      return res.status(400).json({
        error: {
          message: 'Missing either name or content fields.'
        }
      });

    NotesService.updateNote(
      req.app.get('db'),
      req.params.noteId,
      updateNote
    )
      .then(res => {
        res.status(204).end();
      })
      .catch(next);

  })
  .delete((req, res, next) => {
    console.log('In delete!');
    console.log(req.params);
    NotesService.deleteNote(
      req.app.get('db'),
      req.params.noteId
    )
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  });


module.exports = notesRouter;