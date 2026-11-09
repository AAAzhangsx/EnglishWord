add_library(englishword_core
    src/core/study_engine.cpp
    src/core/study_engine.h
    src/core/word.h
)
target_include_directories(englishword_core PUBLIC src)
if(MSVC)
    target_compile_options(englishword_core PUBLIC /utf-8 PRIVATE /W4)
else()
    target_compile_options(englishword_core PRIVATE -Wall -Wextra -Wpedantic)
endif()

if(ENGLISHWORD_BUILD_SERVER)
    find_package(Drogon CONFIG REQUIRED)
    file(READ "${CMAKE_CURRENT_SOURCE_DIR}/db/migrations/001_init.sql" ENGLISHWORD_SCHEMA)
    file(READ "${CMAKE_CURRENT_SOURCE_DIR}/data/demo.tsv" ENGLISHWORD_DEMO_TSV)
    configure_file(cmake/resources.h.in generated/resources.h @ONLY)
    add_library(englishword_server_lib
        src/repositories/word_repository.cpp
        src/repositories/word_repository.h
        src/controllers/api.cpp
        src/controllers/api.h
    )
    target_include_directories(englishword_server_lib PRIVATE "${CMAKE_CURRENT_BINARY_DIR}/generated")
    target_link_libraries(englishword_server_lib PUBLIC englishword_core Drogon::Drogon)
    add_executable(englishword_server src/main.cpp)
    target_link_libraries(englishword_server PRIVATE englishword_server_lib)
    install(TARGETS englishword_server RUNTIME DESTINATION bin)
endif()

if(BUILD_TESTING)
    add_executable(study_engine_tests ../tests/study_engine_tests.cpp)
    target_link_libraries(study_engine_tests PRIVATE englishword_core)
    add_test(NAME study_engine COMMAND study_engine_tests)
    if(ENGLISHWORD_BUILD_SERVER)
        add_executable(database_tests ../tests/database_tests.cpp)
        target_link_libraries(database_tests PRIVATE englishword_server_lib)
        add_test(NAME database COMMAND database_tests)
        find_package(Python3 COMPONENTS Interpreter)
        if(Python3_Interpreter_FOUND)
            add_test(NAME api_integration COMMAND "${Python3_EXECUTABLE}"
                "${PROJECT_SOURCE_DIR}/tests/api_integration.py" "$<TARGET_FILE:englishword_server>")
            set_tests_properties(api_integration PROPERTIES TIMEOUT 30)
        endif()
    endif()
endif()
