# Docker Simple Guide

This guide will help you run the VISTA backend application using Docker. Docker allows you to run applications in isolated environments called "containers," which means you don't have to worry about installing specific versions of Node.js or other dependencies directly on your computer.

## 1. Prerequisites (Install Docker)

Before you begin, you need to have Docker installed on your system.

### If you are on Windows:
1. Download and install **Docker Desktop** from the [official website](https://www.docker.com/products/docker-desktop/).
2. During installation, make sure the **WSL 2** backend is selected (it usually is by default).
3. Once installed, launch the "Docker Desktop" application. You will see a small whale icon in your system tray indicating it is running.
4. You also need a terminal. You can use **PowerShell**, **Command Prompt**, or the terminal inside your IDE (like VS Code).

### If you are on Fedora Linux:
1. Open your terminal.
2. Run the following commands to install Docker and Docker Compose:
   ```bash
   sudo dnf -y install dnf-plugins-core
   sudo dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo
   sudo dnf install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
   ```
3. Start the Docker service and enable it to run on startup:
   ```bash
   sudo systemctl start docker
   sudo systemctl enable docker
   ```
4. Add your user to the `docker` group so you don't have to use `sudo` every time (you may need to log out and log back in for this to take effect):
   ```bash
   sudo usermod -aG docker $USER
   ```

---

## 2. Environment Setup

Inside this `docker-setup` folder, there is an `.env.example` file. 
If the application needs any secret keys or specific configuration, you provide them via an `.env` file.

1. Create a copy of `.env.example` and name it `.env` in this same `docker-setup` folder.
   - **Windows (Command Prompt):** `copy .env.example .env`
   - **Fedora/Windows (PowerShell):** `cp .env.example .env`
2. Open the new `.env` file and modify any values if necessary (e.g., if you have an API key).

---

## 3. Running the Application

Once Docker is running on your computer, follow these exact steps:

1. Open your terminal (PowerShell, Command Prompt, or Fedora Terminal).
2. Navigate to this specific folder (`docker-setup`):
   ```bash
   cd path/to/VISTA-Vision-Integrated-Smart-Track-Analytics-ace/docker-setup
   ```
3. Run the following command to build and start the Docker container in the background:
   ```bash
   docker compose up -d --build
   ```
   *(Note: On older versions of Docker, the command might be `docker-compose up -d --build` with a hyphen).*

4. **Wait for it to finish.** It will download necessary images and set up the application.
5. The backend should now be running! It is exposed on port **3000**. You can test it by going to `http://localhost:3000` in your web browser.

---

## 4. Useful Commands

Here are some commands you might need later (run them from inside this `docker-setup` folder):

- **To see the live logs** (to check for errors or see what the app is doing):
  ```bash
  docker compose logs -f
  ```
  *(Press `Ctrl+C` to stop watching the logs).*

- **To stop the application:**
  ```bash
  docker compose down
  ```

- **To stop the application AND erase the local data/volumes:**
  ```bash
  docker compose down -v
  ```

- **To rebuild the application** (if you changed the source code):
  ```bash
  docker compose up -d --build
  ```
