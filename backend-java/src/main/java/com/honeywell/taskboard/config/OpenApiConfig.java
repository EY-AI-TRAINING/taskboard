package com.honeywell.taskboard.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.servers.Server;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI metadata for the Engineering Task Board API.
 *
 * <p>Once the app is running:
 * <ul>
 *   <li>Swagger UI  — <a href="http://localhost:8080/swagger-ui.html">/swagger-ui.html</a></li>
 *   <li>OpenAPI JSON — <a href="http://localhost:8080/v3/api-docs">/v3/api-docs</a></li>
 * </ul>
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI taskBoardOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Engineering Task Board API")
                        .version("0.1.0")
                        .description("""
                                Module 01 lab (AI Champions Programme). Kanban-style task board \
                                with CRUD + status filtering. The .NET, Python and Java backends \
                                all implement this same contract.""")
                        .contact(new Contact()
                                .name("Honeywell Software Engineering — AI Champions")
                                .url("https://github.com/"))
                        .license(new License().name("Training use only")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("Local Java backend")));
    }
}
