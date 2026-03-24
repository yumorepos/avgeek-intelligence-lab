# Contributing to Flight Price Intelligence Lab

Thank you for considering contributing to this project! This guide will help you get started.

---

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

---

## Code of Conduct

This project follows a simple code of conduct:

### Our Standards
- **Be respectful** of differing viewpoints and experiences
- **Be constructive** in feedback and discussions
- **Be collaborative** in problem-solving
- **Be professional** in all interactions

### Unacceptable Behavior
- Harassment, discrimination, or personal attacks
- Trolling, insulting, or derogatory comments
- Publishing others' private information
- Spam or off-topic discussions

**Enforcement:** Unacceptable behavior may result in a warning or ban from the project.

---

## Getting Started

### Prerequisites
- **Python 3.10+** (backend)
- **Node.js 18+** (frontend)
- **PostgreSQL 14+** (database)
- **Git** (version control)

### Recommended Tools
- **VS Code** with extensions:
  - Python (Microsoft)
  - Pylance (Microsoft)
  - ESLint (Microsoft)
  - Prettier (Prettier)

---

## Development Setup

### 1. Fork & Clone
```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/YOUR_USERNAME/flight-price-intelligence-lab.git
cd flight-price-intelligence-lab
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

### 4. Database Setup
```bash
# Install PostgreSQL locally or use Docker
docker run -d \
  --name fpi-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=flight_intelligence \
  -p 5432:5432 \
  postgres:14

# Run migrations (if available)
cd backend
psql "$FPI_DATABASE_URL" -f ../sql/schema.sql
```

### 5. Environment Variables
```bash
# Create .env file in backend/
cat > backend/.env << EOF
FPI_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/flight_intelligence
FPI_USE_CSV_FALLBACK=true
FPI_CORS_ORIGINS=http://localhost:3000
EOF

# Create .env.local in frontend/
cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
BACKEND_URL=http://localhost:8000
USE_BACKEND_PROXY=true
EOF
```

### 6. Run Development Servers
```bash
# Terminal 1: Backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm run dev
```

Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## How to Contribute

### Types of Contributions

#### 1. Bug Reports
Found a bug? Please create an issue with:
- **Title:** Short, descriptive summary
- **Description:** What happened vs. what you expected
- **Steps to reproduce:** Numbered list
- **Environment:** OS, Python version, Node version
- **Screenshots:** If applicable

**Template:**
```markdown
**Bug:** Route detail page crashes on missing data

**Expected:** Show "No data available" message
**Actual:** 500 Internal Server Error

**Steps:**
1. Go to /routes/JFK/XYZ (non-existent route)
2. Observe error

**Environment:** macOS, Python 3.11, Node 18

**Screenshots:** [attach]
```

#### 2. Feature Requests
Have an idea? Create an issue with:
- **Title:** "Feature: [short description]"
- **Description:** What feature, why it's useful
- **Use case:** Example scenario
- **Alternatives:** Other approaches considered

#### 3. Code Contributions
Want to write code? Follow the [Pull Request Process](#pull-request-process) below.

#### 4. Documentation
Improve docs by:
- Fixing typos
- Adding examples
- Clarifying confusing sections
- Translating to other languages

---

## Pull Request Process

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions

### 2. Make Your Changes
- Follow [Coding Standards](#coding-standards)
- Add tests for new functionality
- Update documentation if needed

### 3. Test Locally
```bash
# Backend tests
cd backend
pytest tests/ -v

# Frontend build
cd frontend
npm run build

# Linting
cd backend
ruff check app/

cd frontend
npm run lint
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: Add airport autocomplete search"
```

**Commit message format:**
```
<type>: <short summary>

<optional body>

<optional footer>
```

**Types:**
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Test additions
- `chore:` Maintenance tasks

**Examples:**
```
feat: Add sorting by reliability score

Adds new query parameter `sort_by=reliability` to the
/routes/explore endpoint. Updates frontend to show sort dropdown.

Closes #42
```

### 5. Push & Create PR
```bash
git push origin feature/your-feature-name
```

Then on GitHub:
1. Click "Create Pull Request"
2. Fill out the PR template
3. Link related issues
4. Request review

### 6. Code Review
- Address reviewer comments
- Push additional commits if needed
- Be responsive (reply within 2-3 days)

### 7. Merge
Once approved:
- Squash commits (if requested)
- Maintainer will merge

---

## Coding Standards

### Python (Backend)

**Style guide:** PEP 8 + Black

**Tools:**
- **black:** Code formatter
- **ruff:** Fast linter
- **mypy:** Type checker

**Run before committing:**
```bash
cd backend
black app/
ruff check app/
mypy app/
```

**Type hints required:**
```python
# Good ✅
def calculate_score(fare: float, reliability: float) -> float:
    return (fare * 0.6) + (reliability * 0.4)

# Bad ❌
def calculate_score(fare, reliability):
    return (fare * 0.6) + (reliability * 0.4)
```

**Docstrings for public functions:**
```python
def calculate_confidence(num_points: int, coverage_months: int) -> str:
    """
    Determine confidence level based on data coverage.
    
    Args:
        num_points: Number of data points available
        coverage_months: Time coverage in months
        
    Returns:
        Confidence level: 'low', 'medium', or 'high'
    """
    if num_points < 3 or coverage_months < 3:
        return "low"
    # ...
```

### TypeScript (Frontend)

**Style guide:** Airbnb + Prettier

**Tools:**
- **prettier:** Code formatter
- **eslint:** Linter

**Run before committing:**
```bash
cd frontend
npm run lint
npx prettier --write .
```

**Strict types required:**
```typescript
// Good ✅
interface RouteData {
  score: number;
  confidence: 'low' | 'medium' | 'high';
  latest_fare: number | null;
}

// Bad ❌
interface RouteData {
  score: any;
  confidence: string;
  latest_fare: number;
}
```

**Use TypeScript, not JavaScript:**
```typescript
// Good ✅
export function formatFare(fare: number | null): string {
  return fare !== null ? `$${fare.toFixed(0)}` : 'N/A';
}

// Bad ❌
export function formatFare(fare) {
  return fare != null ? `$${fare.toFixed(0)}` : 'N/A';
}
```

### Database

**Naming conventions:**
- Tables: `snake_case`, plural (e.g., `route_scores`)
- Columns: `snake_case` (e.g., `latest_fare`)
- Indexes: `idx_table_column` (e.g., `idx_routes_origin`)

**Always include:**
- Primary keys (usually `id`)
- Created/updated timestamps
- Foreign key constraints

**Example:**
```sql
CREATE TABLE route_scores (
    id SERIAL PRIMARY KEY,
    origin VARCHAR(3) NOT NULL,
    destination VARCHAR(3) NOT NULL,
    score FLOAT NOT NULL,
    confidence VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Testing Guidelines

### Backend Tests

**Test file structure:**
```
backend/tests/
├── test_api_endpoints.py
├── test_middleware.py
├── test_scoring_logic.py
└── conftest.py  # Shared fixtures
```

**Use pytest:**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import create_app

@pytest.fixture
def client():
    app = create_app()
    return TestClient(app)

def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"
```

**Run tests:**
```bash
cd backend
pytest tests/ -v --cov=app
```

**Coverage target:** 70% minimum

### Frontend Tests

Currently: Build + type checking only

**Future:** Add React Testing Library
```typescript
import { render, screen } from '@testing-library/react';
import { RouteCard } from '@/components/RouteCard';

test('renders route card with score', () => {
  render(<RouteCard route={mockRoute} />);
  expect(screen.getByText('78')).toBeInTheDocument();
});
```

---

## Documentation

### When to Update Docs

**Always update when:**
- Adding a new feature
- Changing an API endpoint
- Modifying database schema
- Adding dependencies

**Which docs to update:**
- **README.md:** Overview, setup, features
- **API docs:** Endpoint changes
- **Architecture docs:** System design changes
- **docs/truth-first-assessment-2026-03-24.md:** Product truth and current known gaps

### Documentation Style

**Be concise:**
```markdown
# Good ✅
## Installation
Run `npm install` to install dependencies.

# Bad ❌
## Installation
In order to install the necessary dependencies for this project,
you will need to execute the npm install command which will read
the package.json file and download all required packages...
```

**Use code blocks:**
```markdown
# Good ✅
Install dependencies:
\`\`\`bash
npm install
\`\`\`

# Bad ❌
Install dependencies: npm install
```

**Include examples:**
```markdown
# Good ✅
### Get routes
\`GET /routes/explore?origin=JFK\`

Response:
\`\`\`json
{
  "routes": [...]
}
\`\`\`

# Bad ❌
### Get routes
Returns a list of routes.
```

---

## Questions?

### Before Asking
1. Check [README.md](README.md)
2. Check [docs/](docs/) directory
3. Search existing issues
4. Read [docs/truth-first-assessment-2026-03-24.md](docs/truth-first-assessment-2026-03-24.md)

### How to Ask
- Create a GitHub Discussion (preferred)
- Or open an issue with "Question:" prefix
- Be specific, include context

### Response Time
- Expect reply within 2-4 days
- For urgent issues, mention "@maintainer"

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Recognition

Contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Appreciated publicly on social media

Thank you for contributing! 🎉
