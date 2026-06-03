import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateDemandPage from '../CreateDemandPage';
import * as demandsApi from '@/api/demands';
import * as uploadApi from '@/api/upload';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));
vi.mock('@/api/demands', () => ({ createDemand: vi.fn() }));
vi.mock('@/api/upload', () => ({ uploadImage: vi.fn() }));

function renderPage() {
  return render(<CreateDemandPage />);
}

async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('标题'), '代取快递');
  await user.type(screen.getByLabelText('详细描述'), '仙林校区2栋');
  await user.click(screen.getByLabelText('分类'));
  await user.click(screen.getByText('快递代取'));
  await user.type(screen.getByLabelText('报酬'), '10');
}

const submitBtn = () => screen.getByRole('button', { name: /发布需求/ });

describe('CreateDemandPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (demandsApi.createDemand as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 99 }, error: null });
  });

  // ──── 渲染 ────

  it('renders form fields', () => {
    renderPage();
    expect(screen.getByLabelText('标题')).toBeInTheDocument();
    expect(screen.getByLabelText('详细描述')).toBeInTheDocument();
    expect(screen.getByLabelText('分类')).toBeInTheDocument();
    expect(screen.getByLabelText('报酬')).toBeInTheDocument();
  });

  // ──── 校验 ────

  it('shows error when title is empty', async () => {
    renderPage();
    await userEvent.click(submitBtn());
    expect(screen.getByText('请输入需求标题')).toBeInTheDocument();
  });

  it('shows error when no category selected', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText('标题'), '测试');
    await user.type(screen.getByLabelText('详细描述'), '测试描述');
    await user.click(submitBtn());
    expect(screen.getByText('请选择需求分类')).toBeInTheDocument();
  });

  // ──── 提交 ────

  it('submits successfully and navigates after delay', async () => {
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    await user.click(submitBtn());
    await waitFor(() => expect(demandsApi.createDemand).toHaveBeenCalled());
    // setTimeout 导航 800ms
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/demands/99'), { timeout: 2000 });
  }, 10000);

  it('shows error snackbar on submit failure', async () => {
    (demandsApi.createDemand as ReturnType<typeof vi.fn>).mockResolvedValue({ data: null, error: '发布失败' });
    const user = userEvent.setup();
    renderPage();
    await fillForm(user);
    await user.click(submitBtn());
    expect(await screen.findByText('发布失败')).toBeInTheDocument();
  });

  // ──── 图片上传 ────

  it('uploads image and shows chip', async () => {
    (uploadApi.uploadImage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { url: '/uploads/test.jpg' }, error: null });
    renderPage();
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    await userEvent.upload(fileInput, new File([''], 'test.jpg', { type: 'image/jpeg' }));
    await waitFor(() => expect(screen.getByText('已上传')).toBeInTheDocument());
  });

  it('removes image chip on delete', async () => {
    (uploadApi.uploadImage as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { url: '/uploads/test.jpg' }, error: null });
    renderPage();
    const fileInput = document.querySelector('input[type="file"]') as HTMLElement;
    await userEvent.upload(fileInput, new File([''], 't.jpg', { type: 'image/jpeg' }));
    await screen.findByText('已上传');
    const deleteIcon = document.querySelector('[data-testid="CloseIcon"]')!;
    await userEvent.click(deleteIcon);
    await waitFor(() => expect(screen.queryByText('已上传')).not.toBeInTheDocument());
  });
});
