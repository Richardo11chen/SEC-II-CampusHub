import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextType } from '@/store/authContext';
import RegisterPage from '../RegisterPage';

const mockRegister = vi.fn();

const mockAuth: AuthContextType = {
  user: null, accessToken: null, isLoading: false, isAuthenticated: false,
  login: vi.fn(), register: mockRegister, logout: vi.fn(), updateUser: vi.fn(),
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={mockAuth}>
        <RegisterPage />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

let user: ReturnType<typeof userEvent.setup>;

/** 填入有效的表单数据（可选字段留空） */
async function fillValidForm() {
  await user.type(screen.getByLabelText('学号'), '2024123456');
  await user.type(screen.getByLabelText('昵称'), 'testuser');
  await user.type(screen.getByLabelText('密码'), 'pass1234');
  await user.type(screen.getByLabelText('确认密码'), 'pass1234');
}

describe('RegisterPage', () => {
  beforeEach(() => {
    user = userEvent.setup();
    mockRegister.mockReset();
    mockRegister.mockResolvedValue({
      id: 1, nickname: '', studentId: '',
      creditScore: 70, role: 'student', status: '正常', showRealName: false, createdAt: '',
    });
  });

  it('renders all form fields including optional', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: '注册' })).toBeInTheDocument();
    expect(screen.getByLabelText('学号')).toBeInTheDocument();
    expect(screen.getByLabelText('昵称')).toBeInTheDocument();
    expect(screen.getByLabelText('密码')).toBeInTheDocument();
    expect(screen.getByLabelText('确认密码')).toBeInTheDocument();
    expect(screen.getByLabelText('真实姓名（选填）')).toBeInTheDocument();
    expect(screen.getByLabelText('邮箱（选填）')).toBeInTheDocument();
  });

  it('shows error on empty submit', async () => {
    renderPage();
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(screen.getByText('请填写所有必填字段')).toBeInTheDocument();
  });

  it('shows error for invalid studentId', async () => {
    renderPage();
    await user.type(screen.getByLabelText('学号'), '12345');
    await user.type(screen.getByLabelText('昵称'), 'test');
    await user.type(screen.getByLabelText('密码'), 'pass1234');
    await user.type(screen.getByLabelText('确认密码'), 'pass1234');
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(screen.getByText('学号必须为10位数字')).toBeInTheDocument();
  });

  it('shows error for short password', async () => {
    renderPage();
    await user.type(screen.getByLabelText('学号'), '2024123456');
    await user.type(screen.getByLabelText('昵称'), 'test');
    await user.type(screen.getByLabelText('密码'), 'short');
    await user.type(screen.getByLabelText('确认密码'), 'short');
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(screen.getByText('密码长度需在8-32位之间')).toBeInTheDocument();
  });

  it('shows error for password without letter', async () => {
    renderPage();
    await user.type(screen.getByLabelText('学号'), '2024123456');
    await user.type(screen.getByLabelText('昵称'), 'test');
    await user.type(screen.getByLabelText('密码'), '12345678');
    await user.type(screen.getByLabelText('确认密码'), '12345678');
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(screen.getByText('密码必须包含字母和数字')).toBeInTheDocument();
  });

  it('shows error for password mismatch', async () => {
    renderPage();
    await user.type(screen.getByLabelText('学号'), '2024123456');
    await user.type(screen.getByLabelText('昵称'), 'test');
    await user.type(screen.getByLabelText('密码'), 'pass1234');
    await user.type(screen.getByLabelText('确认密码'), 'pass5678');
    await user.click(screen.getByRole('button', { name: '注册' }));
    expect(screen.getByText('两次密码输入不一致')).toBeInTheDocument();
  });

  it('calls register with valid form including optional fields', async () => {
    renderPage();
    await fillValidForm();
    await user.type(screen.getByLabelText('真实姓名（选填）'), '张三');
    await user.type(screen.getByLabelText('邮箱（选填）'), 'zhangsan@nju.edu.cn');
    await user.click(screen.getByRole('button', { name: '注册' }));
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        studentId: '2024123456', password: 'pass1234', nickname: 'testuser',
        name: '张三', email: 'zhangsan@nju.edu.cn', avatar: undefined,
      });
    });
  }, 15000);

  it('shows error message on register failure', async () => {
    mockRegister.mockRejectedValue(new Error('该学号已注册'));
    renderPage();
    await fillValidForm();
    await user.click(screen.getByRole('button', { name: '注册' }));
    await waitFor(() => {
      expect(screen.getByText('该学号已注册')).toBeInTheDocument();
    });
  }, 15000);

  it('shows generic fallback for non-Error rejection', async () => {
    mockRegister.mockRejectedValue('raw error');
    renderPage();
    await fillValidForm();
    await user.click(screen.getByRole('button', { name: '注册' }));
    await waitFor(() => {
      expect(screen.getByText('注册失败')).toBeInTheDocument();
    });
  }, 15000);

  it('has link to login page', () => {
    renderPage();
    expect(screen.getByText('去登录').closest('a')).toHaveAttribute('href', '/login');
  });
});
