import express, { Router, RequestHandler } from 'express';
import * as projectController from '../controllers/project.controller';

const router: Router = express.Router();

// GET all projects
router.get('/', projectController.getAllProjects as RequestHandler);

// GET a single project by ID
router.get('/:id', projectController.getProjectById as RequestHandler);

// POST create a new project
router.post('/', projectController.createProject as RequestHandler);

// PUT update a project
router.put('/:id', projectController.updateProject as RequestHandler);

// DELETE a project
router.delete('/:id', projectController.deleteProject as RequestHandler);

export default router;
