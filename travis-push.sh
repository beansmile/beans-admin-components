#!/bin/sh

setup_git() {
  git config --global user.email "travis@travis-ci.org"
  git config --global user.name "Travis CI"
}

commit_build_changed() {
  git checkout master
  git add dist/*
  git add docs/*
  git commit -m "Travis build: $TRAVIS_BUILD_NUMBER" -m "[skip ci]"
}

push_commit() {
  git remote rm origin
  git remote add origin https://xifengzhu:${GH_TOKEN}@github.com/beansmile/beans-admin-plugin.git > /dev/null 2>&1
  git push origin master --quiet
}

setup_git
commit_build_changed
push_commit
