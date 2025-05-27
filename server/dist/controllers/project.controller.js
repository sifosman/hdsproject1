"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProject = exports.updateProject = exports.createProject = exports.getProjectById = exports.getAllProjects = void 0;
const project_model_1 = __importDefault(require("../models/project.model"));
// Get all projects
const getAllProjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const projects = yield project_model_1.default.find();
        res.status(200).json(projects);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching projects', error });
    }
});
exports.getAllProjects = getAllProjects;
// Get a project by ID
const getProjectById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const project = yield project_model_1.default.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(project);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching project', error });
    }
});
exports.getProjectById = getProjectById;
// Create a new project
const createProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const newProject = new project_model_1.default(req.body);
        const savedProject = yield newProject.save();
        res.status(201).json(savedProject);
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating project', error });
    }
});
exports.createProject = createProject;
// Update a project
const updateProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const updatedProject = yield project_model_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedProject) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json(updatedProject);
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating project', error });
    }
});
exports.updateProject = updateProject;
// Delete a project
const deleteProject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const deletedProject = yield project_model_1.default.findByIdAndDelete(req.params.id);
        if (!deletedProject) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.status(200).json({ message: 'Project deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Error deleting project', error });
    }
});
exports.deleteProject = deleteProject;
