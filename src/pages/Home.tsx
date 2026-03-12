import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { auth } = useAuth();
  const hasNoRoles = !auth.user?.roles?.length && auth.user?.nombre_usuario?.toLowerCase() !== 'superadmin';

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        Bienvenido al Sistema de Gestión de Peruvian Sea Food
      </h1>
      {hasNoRoles && (
        <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <p className="text-amber-800 dark:text-amber-200 font-medium">
            Su cuenta está pendiente de asignación de roles. Contacte al administrador para acceder a las funcionalidades del sistema.
          </p>
        </div>
      )}
    </div>
  );
};

export default Home;