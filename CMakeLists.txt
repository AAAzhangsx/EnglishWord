cmake_minimum_required(VERSION 3.24)
project(EnglishWord VERSION 0.1.0 LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
option(ENGLISHWORD_BUILD_SERVER "Build the C++ HTTP backend" ON)
include(CTest)
add_subdirectory(backend)
