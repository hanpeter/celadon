# -*- coding: utf-8 -*-

from setuptools import setup, find_packages
from os import path
from celadon.version import __version__


# URL to the repository on Github.
REPO_URL = 'https://github.com/hanpeter/github-users'

# Github will generate a tarball as long as you tag your releases,
# so don't forget to tag!
DOWNLOAD_URL = ''.join((REPO_URL, '/tarball/release/', __version__))

try:
    with open(path.join(path.dirname(__file__), 'README.md')) as f:
        long_description = f.read()
except Exception:
    # XXX: Intentional pokemon catch to prevent this read from breaking setup.py
    long_description = None


setup(
    name='celadon',
    version=__version__,
    author='Peter Han',
    author_email='git@peterhan.ca',
    description='API server for inventory management',
    url=REPO_URL,
    download_url=DOWNLOAD_URL,
    packages=find_packages(exclude=['tests']),
    classifiers=[
        'Development Status :: 3 - Alpha',
        'Framework :: Flask',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python',
        'Programming Language :: Python :: 3.9',
    ],
)
