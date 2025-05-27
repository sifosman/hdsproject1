import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

/**
 * Template Service
 * Handles rendering HTML templates with data
 */

// Register Handlebars helpers
Handlebars.registerHelper('inc', (value: number) => {
  return value + 1;
});

/**
 * Render a template with data
 * @param templateName Name of the template file (without extension)
 * @param data Data to render the template with
 */
export const renderTemplate = async (templateName: string, data: any): Promise<string> => {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.html`);
  
  try {
    // Read the template file
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    
    // Compile the template
    const template = Handlebars.compile(templateSource);
    
    // Render the template with data
    return template(data);
  } catch (error) {
    console.error(`Error rendering template ${templateName}:`, error);
    throw new Error(`Failed to render template: ${templateName}`);
  }
};
