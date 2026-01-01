# Contributing to Revue de Presse

Thank you for considering contributing to Revue de Presse! Your contributions help make this project better for everyone.

## Ways to Contribute

- **Bug reports**: Found a bug? Open an issue with reproduction steps
- **Feature requests**: Have an idea? Describe it in a new issue
- **Code contributions**: Fix bugs or implement features via pull requests
- **Documentation**: Improve README, add examples, fix typos
- **Translations**: Help translate the interface

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/revue-de-presse/revue-de-presse.github.io.git
   cd revue-de-presse.github.io/visualization
   ```
3. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. Make your changes
5. Test locally:
   ```bash
   node build-static.js
   python3 -m http.server 8000
   ```
6. Commit and push:
   ```bash
   git add .
   git commit -m "feat: description of your changes"
   git push origin feature/your-feature-name
   ```
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+ (for build script)
- Python 3.10+ (for NLP scripts)
- A modern web browser

### Build

```bash
cd visualization
node build-static.js
```

### Local Server

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

## Pull Request Guidelines

- Keep PRs focused on a single change
- Follow existing code style
- Update documentation if needed
- Test your changes locally before submitting
- Write clear commit messages

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation changes
- `style:` formatting, no code change
- `refactor:` code refactoring
- `test:` adding tests
- `chore:` maintenance tasks

## Code Style

- **JavaScript**: ES6+, no semicolons, single quotes
- **Python**: PEP 8, type hints appreciated
- **HTML/CSS**: 4-space indentation

## Reporting Bugs

When reporting a bug, please include:

1. Browser and version
2. Operating system
3. Steps to reproduce
4. Expected behavior
5. Actual behavior
6. Screenshots if applicable

## Security Vulnerabilities

**Do NOT open public issues for security vulnerabilities.**

Email contact+security@revue-de-presse.org with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact

## Questions?

- Open a [Discussion](https://github.com/revue-de-presse/revue-de-presse.github.io/discussions) for general questions
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the GPL-3.0 License.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Please read and follow it in all interactions.

---

Thank you for helping improve Revue de Presse!
