# Part 格式参考

## Part 独立定义

```oxn
part "install-laravel" {
  description = "安装 Laravel 项目"
  prop "project_dir" { type = string; default = "." }

  probe install ref "@oxn/probes/exec-exit-zero" {
    params = { command = "composer create-project laravel/laravel ${prop.project_dir}" }
  }
  execution = [install]
}
```

## Part 在 Blueprint 中的使用

```oxn
blueprint "app-init" {
  part slot "setup" { deps = [] }
}
```

```oxn
task "init-prod" use "@prj/blueprints/app-init" {
  part slot "setup" ref "@prj/parts/install-laravel" {
    prop project_dir = "/var/www/app"
  }
}
```

## 探针类型

```
# 正确
fs_exists
fs_not_exists
fs_content_match
exec_exit_zero

# 错误（旧名）
fs_match          # → fs_content_match
shell_exec        # → exec_exit_zero
```
