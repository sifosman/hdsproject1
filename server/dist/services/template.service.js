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
exports.renderTemplate = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
/**
 * Template Service
 * Handles rendering HTML templates with data
 */
// Register Handlebars helpers
handlebars_1.default.registerHelper('inc', (value) => {
    return value + 1;
});
/**
 * Render a template with data
 * @param templateName Name of the template file (without extension)
 * @param data Data to render the template with
 */
const renderTemplate = (templateName, data) => __awaiter(void 0, void 0, void 0, function* () {
    const templatePath = path_1.default.join(__dirname, '..', 'templates', `${templateName}.html`);
    try {
        // Read the template file
        const templateSource = fs_1.default.readFileSync(templatePath, 'utf8');
        // Compile the template
        const template = handlebars_1.default.compile(templateSource);
        // Render the template with data
        return template(data);
    }
    catch (error) {
        console.error(`Error rendering template ${templateName}:`, error);
        throw new Error(`Failed to render template: ${templateName}`);
    }
});
exports.renderTemplate = renderTemplate;
