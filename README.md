# FreeCut

FreeCut is a free and open source cut optimizer software for optimizing rectangular cut pieces from panels.
It is easy to use and after you have made the entries in the interface, a PDF file is created with the result.

## Desktop Version

The original desktop version is written in Rust using the Rust bindings for the FLTK Graphical User Interface library [fltk-rs](https://crates.io/crates/fltk),
[comfy-table](https://crates.io/crates/comfy-table), [pdf-canvas](https://crates.io/crates/pdf-canvas) and the genetic algorithms and heuristics from the
[cut-optimizer-2d](https://crates.io/crates/cut-optimizer-2d) crate.

## Web Version with API

This repository now includes a web-based version of FreeCut with API support for integration with other applications like BotSailor. The web version provides all the functionality of the desktop version plus:

- RESTful API for integration with other applications
- Project management and storage
- Responsive web interface
- Cloud-based deployment

### Technology Stack

- **Frontend**: React, TypeScript, Material-UI
- **Backend**: Node.js, Express, TypeScript
- **Database**: MongoDB
- **PDF Generation**: PDFKit

![Screenshot gui0](assets/freecut01.png)
![Screenshot pdf](assets/freecut_screenshot2.png)

## Installation

### Desktop Version (Linux and other)

First install `cargo` and `cmake`, which is a dependency of fltk-sys.

Now, compile the freecut-crate:

```
cargo install freecut
```

### Web Version

#### Prerequisites

- Node.js (v14 or higher)
- MongoDB

#### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/freecut.git
   cd freecut
   ```

2. Install dependencies:
   ```
   # Install frontend dependencies
   cd client
   npm install

   # Install backend dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables:
   - Create a `.env` file in the server directory with the following variables:
     ```
     PORT=5000
     MONGODB_URI=mongodb://localhost:27017/freecut
     ```
   - Create a `.env` file in the client directory with the following variables:
     ```
     VITE_API_URL=http://localhost:5000/api
     ```

4. Start the development servers:
   ```
   # Start the backend server
   cd server
   npm run dev

   # In a separate terminal, start the frontend server
   cd client
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

#### Deployment to Vercel

1. Install the Vercel CLI:
   ```
   npm install -g vercel
   ```

2. Build the project:
   ```
   # Build the frontend
   cd client
   npm run build

   # Build the backend
   cd ../server
   npm run build
   ```

3. Deploy to Vercel:
   ```
   vercel
   ```

4. Set up environment variables in the Vercel dashboard:
   - `MONGODB_URI`: Your MongoDB connection string
## Usage

This software helps you to optimize panel cuts.

### Add a stockpiece

To add a stockpiece, fill all fields and press the "add" Button, the stockpiece will apear in the table
in the output fields.

### Add a cutpiece

To add a cutpiece, fill all fields and press the "add" Button, the cutpiece will apear in the table in the
output.

### Pattern

If a pattern on the workpiece is to be taken into account, then select the respective direction.
In this case, however, a pattern must also be selected on each cutpiece.

### Optimize

Choose a cutwidth between 1 and 15mm and a prefered Layout.
Guillotine-Layout is better for panel-saws.
Now press the [optimize]-Button and a pdf-File with a solution will be generated.

## API Documentation

The web version includes a RESTful API that can be used to integrate with other applications.

### Optimizer API

- `POST /api/optimizer/optimize` - Optimize cutting layout
  - Request body:
    ```json
    {
      "pieces": [
        {
          "width": 100,
          "length": 200,
          "amount": 1,
          "pattern": 0,
          "kind": 1
        },
        {
          "width": 50,
          "length": 75,
          "amount": 5,
          "pattern": 0,
          "kind": 0
        }
      ],
      "unit": 0,
      "width": 3,
      "layout": 0
    }
    ```
  - Response:
    ```json
    {
      "message": "Optimization completed successfully",
      "pdfId": "uuid-string",
      "solution": { ... }
    }
    ```

- `GET /api/optimizer/pdf/:id` - Download PDF result

### Projects API

- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get a project by ID
- `POST /api/projects` - Create a new project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

## Contributions

Contributions are welcome, please create an issue or pull request.
