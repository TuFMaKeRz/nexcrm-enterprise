# 🤝 Contributing to NexCRM Enterprise

Thank you for your interest in contributing to NexCRM Enterprise! We welcome contributions from developers, designers, and testers across the globe.

---

## 📋 Code of Conduct

By participating in this project, you agree to abide by common open-source standards:
- Be respectful and constructive in feedback and discussions.
- Welcome newcomers and encourage diverse perspectives.
- Focus on what is best for the community and project.

---

## 🚀 How to Contribute

### 1. Reporting Bugs
- Search existing [Issues](https://github.com/your-username/nexcrm/issues) to ensure the bug hasn't already been reported.
- If not, create a new issue with:
  - Clear, descriptive title.
  - Steps to reproduce the behavior.
  - Expected vs actual result.
  - Screenshots / error logs (if applicable).
  - Environment details (Node version, browser, OS).

### 2. Suggesting Features & Enhancements
- Open a feature request issue describing the feature, the problem it solves, and proposed UI or API design.
- Discuss with maintainers before starting large PRs.

### 3. Local Development Setup
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/nexcrm.git
   cd nexcrm
   ```
3. Setup Backend:
   ```bash
   cd Backend
   npm install
   cp .env.example .env
   npm run dev
   ```
4. Setup Frontend:
   ```bash
   cd ../Frontend
   npm install
   npm run dev
   ```
5. Create a new feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

### 4. Git Commit Guidelines
- Use conventional commits:
  - `feat:` for new features (e.g., `feat: add export to excel on deals page`)
  - `fix:` for bug fixes (e.g., `fix: resolve invoice tax calculation roundoff`)
  - `docs:` for documentation updates
  - `style:` for formatting, missing semicolons, etc.
  - `refactor:` for code changes that neither fix a bug nor add a feature
  - `test:` for adding or updating tests

### 5. Submitting a Pull Request (PR)
1. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch of the upstream repository.
3. Provide a clear PR description detailing:
   - What changed
   - Relevant issue number (e.g., `Fixes #12`)
   - Testing steps performed

Thank you for helping make NexCRM Enterprise better! ⭐
