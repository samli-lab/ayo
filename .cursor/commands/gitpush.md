根据当前 git diff，生成一个简洁的英文 commit message（不超过 72 字符，动词开头）。
## 提交信息格式（请使用英文）

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
- 
然后依次执行：
git add .
git commit -m "<message>"
git push