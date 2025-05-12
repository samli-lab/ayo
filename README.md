# Ayo

## 这是一个基于 Node 的项目


# 目录结构说明
https://docs.adonisjs.com/guides/getting-started/folder-structure


# 开发环境设置

本项目使用 [Volta](https://volta.sh/) 来管理 Node.js 版本。

## 安装 Volta

1. 安装 Volta：
```bash
curl https://get.volta.sh | bash
```

2. 重新打开终端，验证安装：
```bash
volta --version
```

## 使用 Volta

### 安装项目所需的 Node.js 版本

```bash
# 安装项目指定的 Node.js 版本
volta install node@22

# 查看已安装的版本
volta list
```

### 常用命令

- `volta install node@<version>` - 安装指定版本的 Node.js
- `volta install npm@<version>` - 安装指定版本的 npm
- `volta pin node@<version>` - 为项目固定 Node.js 版本
- `volta pin npm@<version>` - 为项目固定 npm 版本
- `volta list` - 查看已安装的工具
- `volta list all` - 查看所有可用的版本

### 项目版本管理

项目使用 Volta 来固定 Node.js 和 npm 版本，确保所有开发者使用相同的环境。当您克隆项目后，Volta 会自动使用项目指定的版本。

# Git 提交规范

本项目使用 [commitlint](https://commitlint.js.org/) 来规范 Git 提交信息。

## Git Hooks 设置

项目使用 [husky](https://typicode.github.io/husky/) 来管理 Git hooks，确保提交信息符合规范。

### 首次设置

如果您是第一次克隆项目，需要执行以下步骤：

1. 安装依赖：
```bash
npm install
```

2. 确保 Git hooks 已启用：
```bash
git config core.hooksPath .husky
```

### 常见问题

如果遇到 Git hooks 相关错误：

1. 确保已安装所有依赖：
```bash
npm install
```

2. 如果 hooks 不生效，可以尝试重新初始化：
```bash
npx husky init
```

3. 如果遇到权限问题，确保 hooks 文件可执行：
```bash
chmod +x .husky/*
```

## 提交信息格式

提交信息必须符合以下格式：

```
<type>(<scope>): <subject>
```

### Type 类型

- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码格式（不影响代码运行的变动）
- `refactor`: 重构（既不是新增功能，也不是修改bug的代码变动）
- `perf`: 性能优化
- `test`: 增加测试
- `chore`: 构建过程或辅助工具的变动
- `revert`: 回滚
- `ci`: CI配置相关

### Scope 范围

scope 用于说明 commit 影响的范围，比如数据层、控制层、视图层等等。

### Subject 主题

subject 是 commit 目的的简短描述，不超过50个字符。

## 示例

```
feat(auth): 添加用户登录功能
fix(api): 修复用户列表接口返回错误
docs(readme): 更新项目说明文档
style(components): 格式化按钮组件代码
```

## 注意事项

1. 提交信息必须使用小写
2. 提交信息不能为空
3. 提交信息最大长度为72个字符


