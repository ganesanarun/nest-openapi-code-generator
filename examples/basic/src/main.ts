import {NestFactory} from '@nestjs/core';
import {ConsoleLogger, ValidationPipe} from '@nestjs/common';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {AppModule} from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    // enable logging
    app.enableShutdownHooks();
    app.useLogger(new ConsoleLogger());

    // Enable validation
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));

    // Setup Swagger documentation
    const config = new DocumentBuilder()
        .setTitle('User Management API')
        .setDescription('A simple user management API for demonstration')
        .setVersion('1.0')
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.listen(3000);
    console.log('Application is running on: http://localhost:3000');
    console.log('Swagger documentation: http://localhost:3000/api');
}

bootstrap().then(r => {
    console.log("Bootstrap completed");
});