# Mynored Desk

MyNORED Desk is a unified internal digital workplace and ERP-style system designed to streamline various organizational processes. Inspired by Odoo's modular architecture, this project aims to consolidate multiple fragmented systems into a single, cohesive platform.

## Features

- **Memo Management**: Digital memo creation, review, approval, and archiving.
- **Performance Management**: Tools for managing performance cycles, KPIs, 360-degree reviews, and peer feedback.
- **Administration Services**: Interfaces for vehicle requests, boardroom bookings, and refreshment requests.
- **HR Processes**: Onboarding new employees, managing employee profiles, leave requests, and job vacancies.
- **Task Management**: A unified view of personal tasks, assigned tasks, and deadlines.
- **News and Announcements**: A platform for publishing internal news articles and announcements.
- **Unified Dashboard**: A personalized dashboard view that aggregates tasks, approvals, meetings, and notifications.

## Project Structure

The project is organized into several key directories:

- **apps**: Contains the web and API applications.
  - **web**: The frontend application built with Next.js and TypeScript.
  - **api**: The backend application built with NestJS.
- **packages**: Contains shared libraries and components.
  - **database**: Database schema and related functionality.
  - **shared**: Shared utilities, constants, and types.
  - **ui**: Shared UI components and styles.
- **docker**: Docker configuration files for containerization.
- **root files**: Configuration files for the overall project setup.

## Getting Started

To get started with Mynored Desk, follow these steps:

1
   ```

2. **Install dependencies:**
   ```sh
   pnpm install
   ```

3. **Set up environment variables:**
   Copy the `.env.example` file to `.env` in each app/package as needed and configure your environment variables (e.g., database URL, API keys).

4. **Database setup:**
   - Create your development database (PostgreSQL recommended).
   - Update the `DATABASE_URL` in `packages/database/.env` or your main `.env` file.
   - Run Prisma migrations and generate the client:
     ```sh
     pnpm --filter @mynsa-desk/database prisma migrate dev --name init
     pnpm --filter @mynsa-desk/database prisma generate
     ```
   - (Optional) Seed the database with initial data:
     ```sh
     pnpm --filter @mynsa-desk/database prisma db seed
     ```

5. **Run the application:**
   For development:
   ```sh
   pnpm dev
   ```

6. **Access the web application:**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
